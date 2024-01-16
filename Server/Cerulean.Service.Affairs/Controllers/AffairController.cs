using Cerulean.Service.Affairs.Data;
using Cerulean.Service.Affairs.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Service.Affairs.Controllers;

[Route("[controller]")]
public class AffairController : ControllerBase {
	private readonly AffairContext _affairContext;

	public AffairController(AffairContext affairContext) {
		_affairContext = affairContext;
	}

	[HttpGet]
	public IEnumerable<Affair> Get([FromQuery]AffairFilter filter) {
		return _affairContext.Affair.ToList();
	}

	[HttpPost]
	public int Create([FromBody] Affair affair) {
		_affairContext.Affair.Add(affair);
		return _affairContext.SaveChanges();
	}

	[HttpPut]
	public int Update([FromBody] Affair affair) {
		affair.ModifiedOn = DateTime.UtcNow;
		_affairContext.Affair.Update(affair);
		return _affairContext.SaveChanges();
	}

	[HttpDelete]
	public int Delete(Guid id) {
		var affair = _affairContext.Affair.Find(id);
		if (affair == null) return 0;
		_affairContext.Affair.Remove(affair);
		return _affairContext.SaveChanges();
	}
}