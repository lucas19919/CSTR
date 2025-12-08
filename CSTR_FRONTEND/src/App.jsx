import "./App.css";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Metric,
    Text,
    LineChart,
    Accordion,
    AccordionList,
    AccordionHeader,
    AccordionBody,
    NumberInput,
    Button,
    Switch,
} from "@tremor/react";

// --- CONFIGURATION & CONSTANTS ---
const API_URL = "http://localhost:5053";
const MAX_HISTORY_POINTS = 500;

const DEFAULT_CONFIG = {
    Geometry: {
        volume: 100.0,
        heatTransferCoefficient: 500.0,
        heatTransferArea: 5.0,
    },
    Fluid: {
        density: 1000,
        specificHeat: 4180.0,
        thermalConductivity: 0.6,
    },
    Reaction: {
        reactionEnthalpy: -50000,
        activationEnergy: 75000,
        preExponentialFactor: 10000000000,
        reactionOrder: 1.0,
        universalGasConstant: 8.314,
    },
    Operation: {
        inletFlowrate: 0.0278,
        inletConcentration: 10,
        inletTemperature: 300,
        coolantTemperature: 290,
        currentConcentration: 0.5,
        currentTemperature: 350.0,
        timeStep: 0.1,
        currentTime: 0.0,
    },
};

// --- HELPER: DEEP CLONE ---
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// --- HELPER: TIME FORMATTER ---
const formatTime = (seconds) => {
    if (typeof seconds !== "number") return "00:00.000";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
};

// --- CUSTOM HOOK: SIMULATION ENGINE ---
const useReactorEngine = (initialConfig) => {
    const [activeConfig, setActiveConfig] = useState(deepClone(initialConfig));
    const [isRunning, setIsRunning] = useState(false);
    const [isError, setIsError] = useState(false);
    const [history, setHistory] = useState([]);

    // NEW: Track optimization state locally for UI feedback
    const [isOptimizing, setIsOptimizing] = useState(false);

    const runningRef = useRef(false);
    const configRef = useRef(activeConfig);

    useEffect(() => {
        configRef.current = activeConfig;
    }, [activeConfig]);

    // --- API ACTIONS ---
    const initialize = async () => {
        try {
            const res = await fetch(`${API_URL}/reactor/initialize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(configRef.current),
            });
            if (!res.ok) throw new Error("Init Failed");

            setHistory([]);
            setIsError(false);
            setIsRunning(true);
            setIsOptimizing(false); // Reset optimization on new init
            runningRef.current = true;
            runStepLoop();
        } catch (err) {
            console.error(err);
            alert("Backend Connection Failed");
        }
    };

    const stop = () => {
        setIsRunning(false);
        runningRef.current = false;
    };

    const reset = () => {
        stop();
        setHistory([]);
        setIsOptimizing(false);
        setActiveConfig(deepClone(DEFAULT_CONFIG));
    };

    // --- UPDATED OPTIMIZE FUNCTION ---
    const triggerOptimization = async () => {
        try {
            const res = await fetch(`${API_URL}/reactor/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) throw new Error("Optimization Trigger Failed");

            // Toggle local state on success so the button updates
            setIsOptimizing(prev => !prev);

        } catch (err) {
            console.error(err);
            alert("Failed to toggle optimization");
        }
    };

    // --- THE RECURSIVE LOOP ---
    const runStepLoop = useCallback(async () => {
        if (!runningRef.current) return;

        try {
            const currentConfig = configRef.current;
            const dt = currentConfig.Operation.timeStep;

            const res = await fetch(`${API_URL}/reactor/step?dt=${dt}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentConfig),
            });

            if (res.ok) {
                const data = await res.json();

                setActiveConfig((prev) => ({
                    ...prev,
                    Operation: {
                        ...prev.Operation,
                        currentConcentration: data.operation.currentConcentration,
                        currentTemperature: data.operation.currentTemperature,
                        currentTime: data.operation.currentTime,
                    },
                }));

                setHistory((prev) => {
                    const newPoint = {
                        time: formatTime(data.operation.currentTime),
                        rawTime: data.operation.currentTime,
                        Concentration: data.operation.currentConcentration,
                        Temp: data.operation.currentTemperature,
                    };
                    const newHist = [...prev, newPoint];
                    return newHist.slice(-MAX_HISTORY_POINTS);
                });

                if (runningRef.current) {
                    setTimeout(runStepLoop, 50);
                }
            } else {
                throw new Error("Step Failed");
            }
        } catch (error) {
            console.error("Simulation Step Error:", error);
            setIsError(true);
            stop();
        }
    }, []);

    return {
        activeConfig,
        updateActiveConfig: setActiveConfig,
        history,
        isRunning,
        initialize,
        stop,
        reset,
        triggerOptimization,
        isOptimizing, // Exported for UI
        isError,
    };
};


// --- MAIN COMPONENT ---
export default function App() {
    const engine = useReactorEngine(DEFAULT_CONFIG);
    const [localConfig, setLocalConfig] = useState(deepClone(DEFAULT_CONFIG));
    const [autoSync, setAutoSync] = useState(false);
    const [hasPendingChanges, setHasPendingChanges] = useState(false);

    useEffect(() => {
        if (engine.isRunning) {
            setLocalConfig((prev) => ({
                ...prev,
                Operation: {
                    ...prev.Operation,
                    currentConcentration: engine.activeConfig.Operation.currentConcentration,
                    currentTemperature: engine.activeConfig.Operation.currentTemperature,
                    currentTime: engine.activeConfig.Operation.currentTime,
                },
            }));
        } else if (!hasPendingChanges) {
            setLocalConfig(engine.activeConfig);
        }
    }, [engine.activeConfig, engine.isRunning]);

    const handleInputChange = (category, field, value) => {
        const val = parseFloat(value) || 0;
        const newLocal = {
            ...localConfig,
            [category]: { ...localConfig[category], [field]: val },
        };
        setLocalConfig(newLocal);

        if (autoSync) {
            engine.updateActiveConfig((prev) => ({
                ...prev,
                [category]: { ...prev[category], [field]: val },
            }));
            setHasPendingChanges(false);
        } else {
            setHasPendingChanges(true);
        }
    };

    const handlePushParameters = () => {
        engine.updateActiveConfig((prev) => ({
            ...prev,
            Geometry: localConfig.Geometry,
            Fluid: localConfig.Fluid,
            Reaction: localConfig.Reaction,
            Operation: {
                ...prev.Operation,
                inletFlowrate: localConfig.Operation.inletFlowrate,
                inletConcentration: localConfig.Operation.inletConcentration,
                inletTemperature: localConfig.Operation.inletTemperature,
                coolantTemperature: localConfig.Operation.coolantTemperature,
                timeStep: localConfig.Operation.timeStep,
            }
        }));
        setHasPendingChanges(false);
    };

    return (
        <div className="flex h-screen w-screen bg-[#F5F5F7] overflow-hidden font-sans text-slate-800">

            {/* SIDEBAR */}
            <aside className="w-80 h-full flex flex-col bg-white/60 backdrop-blur-md border-r border-white/50 shrink-0 z-20">
                <div className="px-8 py-6 pb-4">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        Reactor<span className="text-indigo-600">.Control</span>
                    </h1>
                    <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                        Configuration Panel
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                    <AccordionList className="space-y-4">
                        <MinimalConfigSection
                            title="Geometry"
                            data={localConfig.Geometry}
                            category="Geometry"
                            onChange={handleInputChange}
                        />
                        <MinimalConfigSection
                            title="Fluid Properties"
                            data={localConfig.Fluid}
                            category="Fluid"
                            onChange={handleInputChange}
                        />
                        <MinimalConfigSection
                            title="Kinetics"
                            data={localConfig.Reaction}
                            category="Reaction"
                            onChange={handleInputChange}
                            lockedFields={["universalGasConstant"]}
                        />
                        <MinimalConfigSection
                            title="Operation"
                            data={localConfig.Operation}
                            category="Operation"
                            onChange={handleInputChange}
                            hiddenFields={["currentTime", "currentConcentration", "currentTemperature"]}
                        />
                    </AccordionList>
                </div>

                {/* CONTROLS FOOTER */}
                <div className="p-6 bg-gradient-to-t from-white/90 to-transparent flex flex-col gap-3 border-t border-slate-100">

                    <div className="flex flex-col gap-2 mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-500">Auto-Update</span>
                            <Switch
                                id="auto-sync"
                                checked={autoSync}
                                onChange={setAutoSync}
                                color="indigo"
                            />
                        </div>

                        {!autoSync && (
                            <Button
                                size="xs"
                                variant="primary"
                                color={hasPendingChanges ? "amber" : "slate"}
                                disabled={!hasPendingChanges}
                                onClick={handlePushParameters}
                                className="w-full mt-1 transition-all"
                            >
                                {hasPendingChanges ? "Sync Pending Changes" : "Parameters Synced"}
                            </Button>
                        )}
                    </div>

                    {/* --- FEEDBACK BUTTON FOR OPTIMIZATION --- */}
                    <Button
                        size="md"
                        // Change style based on state
                        variant={engine.isOptimizing ? "primary" : "secondary"}
                        color={engine.isOptimizing ? "emerald" : "violet"}
                        className={`w-full rounded-xl shadow-sm transition-all duration-300 ${engine.isOptimizing
                                ? "border-emerald-500 ring-2 ring-emerald-100 shadow-emerald-200/50"
                                : "border-violet-200 text-violet-600 hover:bg-violet-50"
                            }`}
                        onClick={engine.triggerOptimization}
                    >
                        {engine.isOptimizing ? (
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                Optimization Active
                            </div>
                        ) : (
                            "Enable Optimization"
                        )}
                    </Button>

                    {engine.isRunning ? (
                        <Button
                            size="xl"
                            className="w-full rounded-2xl shadow-lg shadow-rose-200/50 border-0"
                            color="rose"
                            onClick={engine.stop}
                        >
                            Stop Simulation
                        </Button>
                    ) : (
                        <>
                            <Button
                                size="xl"
                                className="w-full rounded-2xl shadow-lg shadow-indigo-200/50 border-0"
                                color="indigo"
                                onClick={engine.initialize}
                            >
                                {engine.history.length > 0 ? "Resume System" : "Initialize System"}
                            </Button>
                            <Button
                                size="md"
                                variant="secondary"
                                className="w-full rounded-xl border-slate-200 text-slate-500 hover:bg-slate-100"
                                onClick={engine.reset}
                            >
                                Reset to Defaults
                            </Button>
                        </>
                    )}
                </div>
            </aside>

            {/* MAIN DASHBOARD */}
            <main className="flex-1 h-full flex flex-col relative overflow-hidden p-6 gap-6">

                {/* HEADER */}
                <header className="shrink-0 flex justify-between items-center px-2">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
                            Telemetry Dashboard
                        </h2>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-100">
                        <div
                            className={`w-2 h-2 rounded-full ${engine.isRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                                }`}
                        ></div>
                        <Text className="font-medium">
                            {engine.isRunning ? "System Active" : "Standby Mode"}
                        </Text>
                        <div className="h-4 w-px bg-slate-200 mx-2"></div>
                        <div className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 rounded">
                            T+ {formatTime(engine.activeConfig.Operation.currentTime)}
                        </div>
                    </div>
                </header>

                {/* GRID LAYOUT */}
                <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-6 gap-4">

                    {/* KPIs */}
                    <div className="col-span-12 row-span-1 grid grid-cols-4 gap-4">
                        <KPIBlock
                            title="Current Conc."
                            value={`${engine.activeConfig.Operation.currentConcentration.toFixed(4)} M`}
                            delta={engine.isRunning ? "Simulating" : "-"}
                        />
                        <KPIBlock
                            title="Current Temp."
                            value={`${engine.activeConfig.Operation.currentTemperature.toFixed(1)} K`}
                            delta={engine.isRunning ? "Simulating" : "-"}
                        />
                        <KPIBlock
                            title="Residence Time"
                            value={
                                (engine.activeConfig.Geometry.volume /
                                    engine.activeConfig.Operation.inletFlowrate /
                                    60).toFixed(1) + " min"
                            }
                            delta={"Calc"}
                        />
                        <KPIBlock
                            title="Conv. Rate"
                            value={
                                (
                                    ((engine.activeConfig.Operation.inletConcentration -
                                        engine.activeConfig.Operation.currentConcentration) /
                                        engine.activeConfig.Operation.inletConcentration) *
                                    100
                                ).toFixed(2) + "%"
                            }
                            delta={"Calc"}
                        />
                    </div>

                    {/* CHARTS AREA */}
                    <div className="col-span-8 row-span-5 grid grid-rows-2 gap-4">
                        <ChartCard title="Concentration Progression" data={engine.history} categories={["Concentration"]} color="cyan" />
                        <ChartCard title="Temperature Progression" data={engine.history} categories={["Temp"]} color="orange" />
                    </div>

                    {/* VISUALIZATION AREA */}
                    <div className="col-span-4 row-span-5 flex flex-col gap-4 h-full">
                        <RangeCard
                            title="Inlet Flow Rate"
                            value={engine.activeConfig.Operation.inletFlowrate}
                            unit="L/s"
                            min={0}
                            max={0.5}
                            color="indigo"
                        />
                        <RangeCard
                            title="Inlet Concentration"
                            value={engine.activeConfig.Operation.inletConcentration}
                            unit="mol/L"
                            min={0}
                            max={10}
                            color="cyan"
                        />
                        <RangeCard
                            title="Inlet Temperature"
                            value={engine.activeConfig.Operation.inletTemperature}
                            unit="K"
                            min={200}
                            max={600}
                            color="orange"
                        />
                        <RangeCard
                            title="Coolant Temperature"
                            value={engine.activeConfig.Operation.coolantTemperature}
                            unit="K"
                            min={200}
                            max={500}
                            color="blue"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- SUB-COMPONENTS ---
function ChartCard({ title, data, categories, color }) {
    return (
        <div className="bg-white rounded-[2rem] p-6 flex flex-col justify-between transition-all duration-300 ring-1 ring-slate-100 shadow-sm">
            <h3 className="font-semibold text-slate-600 mb-2">{title}</h3>
            <div className="flex-1 min-h-0 w-full">
                <LineChart
                    className="h-full w-full"
                    data={data}
                    index="time"
                    categories={categories}
                    colors={[color]}
                    showYAxis={true}
                    showXAxis={true}
                    showLegend={false}
                    showGridLines={true}
                    autoMinValue={true}
                    curveType="monotone"
                />
            </div>
        </div>
    );
}

function RangeCard({ title, value, unit, min, max, color }) {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const colorMap = {
        indigo: "bg-indigo-500",
        cyan: "bg-cyan-500",
        orange: "bg-orange-500",
        blue: "bg-blue-500",
        slate: "bg-slate-500",
    };

    return (
        <div className="flex-1 bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex flex-col justify-center transition-all">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {title}
                </span>
                <span className="text-lg font-bold text-slate-700 font-mono">
                    {value} <span className="text-[10px] text-slate-400 font-sans">{unit}</span>
                </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${colorMap[color]}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[9px] font-medium text-slate-300">{min}</span>
                <span className="text-[9px] font-medium text-slate-300">{max}</span>
            </div>
        </div>
    );
}

function KPIBlock({ title, value, delta }) {
    return (
        <div className="bg-white rounded-[2rem] p-4 flex flex-col items-center justify-center text-center ring-1 ring-slate-100 shadow-sm">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {title}
            </Text>
            <Metric className="text-3xl text-slate-800">{value}</Metric>
            <div className="mt-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
                {delta}
            </div>
        </div>
    );
}

function MinimalConfigSection({
    title,
    data,
    category,
    onChange,
    lockedFields = [],
    hiddenFields = [],
}) {
    return (
        <Accordion className="border-none shadow-none ring-0 bg-transparent">
            <AccordionHeader className="px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                {title}
            </AccordionHeader>
            <AccordionBody className="px-4 pb-2 pt-0 space-y-3">
                {Object.keys(data)
                    .filter((key) => !hiddenFields.includes(key))
                    .map((key) => (
                        <div key={key} className="group">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                </label>
                            </div>
                            <NumberInput
                                value={data[key]}
                                onValueChange={(v) => onChange(category, key, v)}
                                disabled={lockedFields.includes(key)}
                                className="!border-0 !ring-0 !bg-slate-50 !shadow-none focus:!bg-white focus:!ring-1 focus:!ring-indigo-100 rounded-lg transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    ))}
            </AccordionBody>
        </Accordion>
    );
}