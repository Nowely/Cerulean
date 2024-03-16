using Cerulean.Service.Affairs.Data;

namespace Cerulean.Service.Affairs.API;

public record AffairServices {
	public AffairContext Context { get; set; }
}