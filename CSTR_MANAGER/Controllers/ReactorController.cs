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
        public IActionResult Step([FromQuery] float dt = 0.1f)
        {
            var newState = _reactorService.Step(dt);
            return Ok(newState);
        }

        [HttpGet("status")]
        public IActionResult GetState()
        {
            return Ok(_reactorService.GetCurrentState());
        }

        [HttpGet("simulate")]
        public IActionResult simulateRun(CSTR_Reactor reactor, [FromQuery] int time)
        {
            StringBuilder export = _reactorService.simulateRun(reactor, time);
            byte[] fileBytes = System.Text.Encoding.UTF8.GetBytes(export.ToString());

            return File(fileBytes, "text/csv", $"simulation_{time}.csv");
        }
    }
}
