using Cerulean.Service.Affairs.Data;
using Cerulean.Service.Affairs.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Service.Affairs.Controllers;

[Route("[controller]")]
public class UserController : ControllerBase {
	private readonly AffairContext _affairContext;

	public UserController(AffairContext affairContext) {
		_affairContext = affairContext;
	}

	[HttpGet]
	public IEnumerable<User> Get() {
		return _affairContext.User.ToList();
	}

	[HttpPost]
	public int Create([FromBody] User value) {
		_affairContext.User.Add(value);
		return _affairContext.SaveChanges();
	}

	[HttpPut]
	public int Update([FromBody] User value) {
		value.ModifiedOn = DateTime.UtcNow;
		_affairContext.User.Update(value);
		return _affairContext.SaveChanges();
	}

	[HttpDelete]
	public int Delete(Guid id) {
		var value = _affairContext.User.Find(id);
		if (value == null) return 0;
		_affairContext.User.Remove(value);
		return _affairContext.SaveChanges();
	}
}