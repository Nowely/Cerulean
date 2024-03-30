using Affairs.Infrastructure;

namespace Affairs.API;

public record AffairServices {
	public required AffairContext Context { get; set; }
}