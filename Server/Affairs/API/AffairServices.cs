using Affairs.Infrastructure;

namespace Affairs.API;

public record AffairServices {
	public AffairContext Context { get; set; }
}