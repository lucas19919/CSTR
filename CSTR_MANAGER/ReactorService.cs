using System.Linq;
using System.Text;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using System.Text.Json;

namespace CSTR_MANAGER;

public class ReactorService
{
    private CSTR_Reactor model;
    private Solver solver;

    public bool optimize = false;

    public ReactorService()
    {
        model = new CSTR_Reactor();
        solver = new Solver();
    }

    public void Initialize(CSTR_Reactor initialSettings)
    {
        model = initialSettings;
    }
    public void UpdateModel(CSTR_Reactor inputs)
    {
        model.Geometry.volume = inputs.Geometry.volume;
        model.Geometry.heatTransferArea = inputs.Geometry.heatTransferArea;
        model.Geometry.heatTransferCoefficient = inputs.Geometry.heatTransferCoefficient;

        model.Fluid.density = inputs.Fluid.density;
        model.Fluid.specificHeat = inputs.Fluid.specificHeat;
        model.Fluid.thermalConductivity = inputs.Fluid.thermalConductivity;

        model.Reaction.reactionEnthalpy = inputs.Reaction.reactionEnthalpy;
        model.Reaction.activationEnergy = inputs.Reaction.activationEnergy;
        model.Reaction.preExponentialFactor = inputs.Reaction.preExponentialFactor;
        model.Reaction.reactionOrder = inputs.Reaction.reactionOrder;

        model.Operation.inletFlowrate = inputs.Operation.inletFlowrate;
        model.Operation.inletConcentration = inputs.Operation.inletConcentration;
        model.Operation.inletTemperature = inputs.Operation.inletTemperature;
        model.Operation.coolantTemperature = inputs.Operation.coolantTemperature;
        model.Operation.timeStep = inputs.Operation.timeStep;
    }

    public void OptimizeControls()
    {

    }

    public CSTR_Reactor Step(float dt)
    {
        model.Operation.timeStep = dt;
        if (optimize)
            OptimizeControls();

        solver.CalculateNextStep(model, dt);

        return model;
    }

    public CSTR_Reactor GetCurrentState()
    {
        return model;
    }

    public StringBuilder SimulateRun(CSTR_Reactor reactor, int time)
    {
        var op = reactor.Operation;
        float timeStep = op.timeStep;
        int totalSteps = (int)(time / timeStep);

        StringBuilder sb = new StringBuilder(totalSteps * 120);

        sb.AppendLine("Concentration,Temperature,ConversionRate,InletFlow,InletConc,InletTemp,CoolantTemp,NextConcentration,NextTemperature,NextConversionRate");

        Random rand = new Random();

        for (int i = 0; i <= totalSteps; i++)
        {
            float currentSimTime = i * timeStep;

            float startConc = op.currentConcentration;
            float startTemp = op.currentTemperature;

            float inletFlow = op.inletFlowrate;
            float inletConc = op.inletConcentration;
            float inletTemp = op.inletTemperature;
            float coolantTemp = op.coolantTemperature;

            float conversion = 0;
            if (inletConc != 0)
            {
                conversion = Math.Clamp((inletConc - startConc) / inletConc, 0f, 1f);
            }

            float conversion2 = 0;
            if (i < totalSteps)
            {
                solver.CalculateNextStep(reactor, timeStep);
                conversion2 = Math.Clamp((reactor.Operation.inletConcentration - reactor.Operation.currentConcentration) / reactor.Operation.inletConcentration, 0f, 1f);
            }

            sb.AppendLine($"{startConc:F4},{startTemp:F2},{conversion:F2},{inletFlow:F2},{inletConc:F2},{inletTemp:F2},{coolantTemp:F2},{reactor.Operation.currentConcentration:F4},{reactor.Operation.currentTemperature:F2},{conversion2:F2}");

            reactor.Operation.inletFlowrate = Math.Clamp(ApplyNoise(op.inletFlowrate, rand, 0.1f), 0, 1) / 1; //max 1
            reactor.Operation.inletConcentration = Math.Clamp(ApplyNoise(op.inletConcentration, rand, 0.1f), 0, 15); //max 15
            reactor.Operation.inletTemperature = Math.Clamp(ApplyNoise(op.inletTemperature, rand, 0.1f), 271, 500); //271 < t < 500
            reactor.Operation.coolantTemperature = Math.Clamp(ApplyNoise(op.coolantTemperature, rand, 0.1f), 271, 500); //271 < t < 500
        }

        return sb;
    }

    private float ApplyNoise(float value, Random rand, float stdDev)
    {
        double u1 = 1.0 - rand.NextDouble();
        double u2 = 1.0 - rand.NextDouble();
        double randStdNormal = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);

        return value + (float)(stdDev * randStdNormal);
    }
}