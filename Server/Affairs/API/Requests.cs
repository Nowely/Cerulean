using Affairs.Models.Affair.Dto;
using Microsoft.AspNetCore.Mvc;

namespace Affairs.API;

public record GetAllRequest : AffairServices {

}

public record CreateRequest : AffairServices {
	[FromBody]
	public AffairAdd Affair { get; set; }
}

public record UpdateRequest : AffairServices {
	[FromBody]
	public AffairUpdate Affair { get; set; }
}

public record DeleteRequest : AffairServices {
	[FromBody]
	public Guid[] Ids { get; set; }
}