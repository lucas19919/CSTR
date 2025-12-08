using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace CSTR_MANAGER.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ReactorController : ControllerBase
    {
        private readonly ReactorService _reactorService;

        public ReactorController(ReactorService reactorService)
        {
            _reactorService = reactorService;
        }

        [HttpPost("initialize")]
        public IActionResult Initialize([FromBody] CSTR_Reactor initialSettings)
        {
            _reactorService.Initialize(initialSettings);
            return Ok();
        }

        [HttpPost("step")]
        public IActionResult Step(CSTR_Reactor updatedModel, [FromQuery] float dt = 0.1f)
        {
            _reactorService.UpdateModel(updatedModel);
            var newState = _reactorService.Step(dt);
            return Ok(newState);
        }

        [HttpGet("status")]
        public IActionResult GetState()
        {
            return Ok(_reactorService.GetCurrentState());
        }

        [HttpPost("optimize")]
        public IActionResult TriggerOptimization()
        {
            _reactorService.optimize = (_reactorService.optimize == true) ? false : true;

            return Ok();
        }

        [HttpGet("simulate")]
        public IActionResult SimulateRun(CSTR_Reactor reactor, [FromQuery] int time)
        {
            StringBuilder export = _reactorService.SimulateRun(reactor, time);
            byte[] fileBytes = System.Text.Encoding.UTF8.GetBytes(export.ToString());

            return File(fileBytes, "text/csv", $"simulation_{time}.csv");
        }
    }
}
