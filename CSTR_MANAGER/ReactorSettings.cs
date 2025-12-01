namespace CSTR_MANAGER
{
    //Hardware
    public class R_Geometry
    {
        public float volume { get; set; }
        public float heatTransferCoefficient { get; set; }
        public float heatTransferArea { get; set; }
    }

    //Material Properties
    public class R_Fluid
    {
        public float density { get; set; }
        //public float viscosity { get; set; }
        public float specificHeat { get; set; }
        public float thermalConductivity { get; set; }
    }

    //Chemical Kinetics
    public class R_Reaction
    {
        public float reactionEnthalpy { get; set; }
        public float activationEnergy { get; set; }
        public float preExponentialFactor { get; set; }
        public float reactionOrder { get; set; }
        public float universalGasConstant { get; set; } = 8.314f;
    }

    public class R_Operation
    {
        //Independent
        public float inletFlowrate { get; set; }
        public float inletConcentration { get; set; }
        public float inletTemperature { get; set; }
        public float coolantTemperature { get; set; }

        //Current State
        public float currentConcentration { get; set; }
        public float currentTemperature { get; set; }

        //Simulation Settings
        public float timeStep { get; set; }
        public float currentTime { get; set; }
        }
}
