using Cerulean.Data;
using Cerulean.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Controllers;

[Route("[controller]")]
public class UserController : ControllerBase {
	private readonly Context _context;

	public UserController(Context context) {
		_context = context;
	}

	[HttpGet]
	public IEnumerable<User> Get() {
		return _context.User.ToList();
	}

	[HttpPost]
	public int Create([FromBody] User value) {
		_context.User.Add(value);
		return _context.SaveChanges();
	}

	[HttpPut]
	public int Update([FromBody] User value) {
		value.ModifiedOn = DateTime.UtcNow;
		_context.User.Update(value);
		return _context.SaveChanges();
	}

	[HttpDelete]
	public int Delete(Guid id) {
		var value = _context.User.Find(id);
		if (value == null) return 0;
		_context.User.Remove(value);
		return _context.SaveChanges();
	}
}