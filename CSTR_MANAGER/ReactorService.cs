using System.Linq;
using System.Text;

namespace CSTR_MANAGER;

public class ReactorService
{
    private CSTR_Reactor model;
    private Solver solver;

    public ReactorService()
    {
        model = new CSTR_Reactor();
        solver = new Solver(); 
    }

    public void Initialize(CSTR_Reactor initialSettings)
    {
        model = initialSettings;
    }

    public CSTR_Reactor Step(float dt)
    {
        solver.CalculateNextStep(model, dt);

        return model;
    }

    public CSTR_Reactor GetCurrentState()
    {
        return model;
    }
    
    public StringBuilder simulateRun(CSTR_Reactor reactor, int time)
    {
        StringBuilder sb = new StringBuilder();
        sb.AppendLine("Time,Concentration,Temperature,ConversionRate");

        float timeStep = reactor.Operation.timeStep;
        int totalSteps = (int)(time / timeStep); 

        for (int i = 0; i <= totalSteps; i++)
        {
            float currentSimTime = i * timeStep;
            float currentConc = reactor.Operation.currentConcentration;
            float currentTemp = reactor.Operation.currentTemperature;
    
            float conversion = 0;
            if (reactor.Operation.inletConcentration != 0)
            {
                conversion = (reactor.Operation.inletConcentration - currentConc) / reactor.Operation.inletConcentration;
            }

            sb.AppendLine($"{currentSimTime:F2},{currentConc:F4},{currentTemp:F2},{conversion:P2}");

            if (i < totalSteps)
            {
                solver.CalculateNextStep(reactor, timeStep);
            }
        }

        return sb;
    }
}