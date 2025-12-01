namespace CSTR_MANAGER
{
    public class CSTR_Reactor
    {
        public R_Geometry Geometry { get; set; }
        public R_Fluid Fluid { get; set; }
        public R_Reaction Reaction { get; set; }
        public R_Operation Operation { get; set; }

        public CSTR_Reactor()
        {
            Geometry = new R_Geometry();
            Fluid = new R_Fluid();
            Reaction = new R_Reaction();
            Operation = new R_Operation();
        }
    }
}