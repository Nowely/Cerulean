using Cerulean.Data;
using Cerulean.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Controllers;

[Route("[controller]")]
public class PageController : ControllerBase {
	private readonly Context _context;

	public PageController(Context context) {
		_context = context;
	}

	[HttpGet]
	public IEnumerable<Page> Get() {
		var a = _context.Page.ToList();
		return a;
	}

	/*[HttpGet]
	public IEnumerable<Page> GetByUser(Guid id) => _context.Page.Where(page => page.UserId == id).ToList();*/

	[HttpPost]
	public int Create([FromBody] Page value) {
		_context.Page.Add(value);
		return _context.SaveChanges();
	}

	[HttpPut]
	public int Update([FromBody] Page value) {
		value.ModifiedOn = DateTime.UtcNow;
		_context.Page.Update(value);
		return _context.SaveChanges();
	}

	[HttpDelete]
	public int Delete(Guid id) {
		var value = _context.Page.Find(id);
		if (value == null) return 0;
		_context.Page.Remove(value);
		return _context.SaveChanges();
	}
}