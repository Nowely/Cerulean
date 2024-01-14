using Cerulean.Service.Affairs.Data;
using Cerulean.Service.Affairs.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Service.Affairs.Controllers;

[Route("[controller]")]
public class PageController : ControllerBase {
	private readonly AffairContext _affairContext;

	public PageController(AffairContext affairContext) {
		_affairContext = affairContext;
	}

	[HttpGet]
	public IEnumerable<Page> Get() {
		var a = _affairContext.Page.ToList();
		return a;
	}

	/*[HttpGet]
	public IEnumerable<Page> GetByUser(Guid id) => _context.Page.Where(page => page.UserId == id).ToList();*/

	[HttpPost]
	public int Create([FromBody] Page value) {
		_affairContext.Page.Add(value);
		return _affairContext.SaveChanges();
	}

	[HttpPut]
	public int Update([FromBody] Page value) {
		value.ModifiedOn = DateTime.UtcNow;
		_affairContext.Page.Update(value);
		return _affairContext.SaveChanges();
	}

	[HttpDelete]
	public int Delete(Guid id) {
		var value = _affairContext.Page.Find(id);
		if (value == null) return 0;
		_affairContext.Page.Remove(value);
		return _affairContext.SaveChanges();
	}
}