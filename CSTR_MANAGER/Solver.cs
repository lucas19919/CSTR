using CSTR_MANAGER;

public class Solver
{
    public void CalculateNextStep(CSTR_Reactor model, float dt)
    {
        // 1. Calculate Reaction Rate
        float k = model.Reaction.preExponentialFactor * (float)Math.Exp(-model.Reaction.activationEnergy / (model.Reaction.universalGasConstant * model.Operation.currentTemperature));
        float rate = k * model.Operation.currentConcentration;

        // 2. Calculate Gradients
        float concGradient = getConcGrad(model, rate);
        float tempGradient = getTempGrad(model, rate);

        // 3. Update State (Euler Integration)
        model.Operation.currentConcentration += concGradient * dt;
        model.Operation.currentTemperature += tempGradient * dt;

        // --- ADD THIS LINE ---
        model.Operation.currentTime += dt;
    }

    float getConcGrad(CSTR_Reactor model, float rate)
    {
        float F = model.Operation.inletFlowrate;
        float V = model.Geometry.volume;
        float C_in = model.Operation.inletConcentration;
        float C = model.Operation.currentConcentration;

        float grad = F / V * (C_in - C) - rate;
        return grad;
    }

    float getTempGrad(CSTR_Reactor model, float rate)
    {
        float F = model.Operation.inletFlowrate;
        float V = model.Geometry.volume;
        float T_in = model.Operation.inletTemperature;
        float T = model.Operation.currentTemperature;
        float H = model.Reaction.reactionEnthalpy;
        float p = model.Fluid.density;
        float Cp = model.Fluid.specificHeat;
        float UA = model.Geometry.heatTransferCoefficient * model.Geometry.heatTransferArea;
        float T_c = model.Operation.coolantTemperature;

        float grad = F / V * (T_in - T) + (-H / (p * Cp)) * rate + (UA / (V * p * Cp)) * (T_c - T);
        return grad;
    }
}