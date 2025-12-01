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
}