using Cerulean.Service.Affairs.Models.Affair.Dto;
using Microsoft.AspNetCore.Mvc;

namespace Cerulean.Service.Affairs.API;

public record GetAllRequest : AffairServices {

}

public record CreateRequest : AffairServices {
	[FromBody]
	public AffairAdd affair { get; set; }
}

public record UpdateRequest : AffairServices {
	[FromBody]
	public AffairUpdate affair { get; set; }
}

public record DeleteRequest : AffairServices {
	[FromBody]
	public Guid[] ids { get; set; }
}