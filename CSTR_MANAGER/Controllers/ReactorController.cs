using Microsoft.AspNetCore.Mvc;

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
    }
}
