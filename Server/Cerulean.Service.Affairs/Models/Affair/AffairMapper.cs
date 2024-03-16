using Riok.Mapperly.Abstractions;

namespace Cerulean.Service.Affairs.Models.Affair;

[Mapper]
public static partial class AffairMapper
{
	public static partial IQueryable<AffairGet> ProjectToDto(this IQueryable<Affair> q);
}