using Afilter.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Affairs.Models.Requests;

public record FilterableRequest<TDb, TFilter>
	where TFilter : IFilter {
	[FromBody] public TFilter? Filter { get; set; }
	[FromQuery] public int? Page { get; set; }
	[FromQuery] public int? PageSize { get; set; }
	[FromQuery] public int? Search { get; set; }
	public required TDb Db { get; set; }
}