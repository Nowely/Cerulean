using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using Microsoft.AspNetCore.Mvc;

namespace Affairs.API;

public record GetAllRequest : AffairServices {
	[FromQuery]
	public AffairFilter? Filter { get; set; }

	[FromBody]
	public AffairFilter? Filter1 { get; set; }
}

public record CreateRequest : AffairServices {
	[FromBody]
	public required AffairAdd Affair { get; set; }
}

public record UpdateRequest : AffairServices {
	[FromBody]
	public required AffairUpdate Affair { get; set; }
}

public record DeleteRequest : AffairServices {
	[FromBody]
	public required Guid[] Ids { get; set; }
}