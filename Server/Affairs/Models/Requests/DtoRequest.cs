using Microsoft.AspNetCore.Mvc;

namespace Affairs.Models.Requests;

public record DtoRequest<TDb, TDto> {
	[FromBody] public required TDto Dto { get; set; }
	public required TDb Db { get; set; }
}