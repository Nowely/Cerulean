using Microsoft.AspNetCore.Mvc;

namespace Affairs.Models.Requests;

public record IdsRequest<TDb, TId> {
	[FromBody] public required TId[] Ids { get; set; }
	public required TDb Db { get; set; }
}