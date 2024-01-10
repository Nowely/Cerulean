using System.Collections.Generic;
using System.Linq;
using Cerulean.Data;
using Cerulean.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Controllers;

[Route("[controller]")]
public class AffairController : ControllerBase {
	private readonly Context _context;

	public AffairController(Context context) {
		_context = context;
	}

	[HttpGet]
	public IEnumerable<Affair> Get() => _context.Affair.ToList();

	[HttpPost]
	public int Create([FromBody] Affair affair) {
		_context.Affair.Add(affair);
		return _context.SaveChanges();
	}

	[HttpPut]
	public int Update([FromBody] Affair affair) {
		affair.ModifiedOn = DateTime.UtcNow;
		_context.Affair.Update(affair);
		return _context.SaveChanges();
	}

	[HttpDelete]
	public int Delete(Guid id) {
		var affair = _context.Affair.Find(id);
		if (affair == null) return 0;
		_context.Affair.Remove(affair);
		return _context.SaveChanges();
	}
}