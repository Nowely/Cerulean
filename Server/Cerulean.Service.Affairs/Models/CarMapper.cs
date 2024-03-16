using Riok.Mapperly.Abstractions;

namespace Cerulean.Service.Affairs.Models;

[Mapper]
public static partial class CarMapper
{
	public static partial IQueryable<AffairShort> ProjectToDto(this IQueryable<Affair> q);
}