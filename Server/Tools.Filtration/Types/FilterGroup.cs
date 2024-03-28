using Tools.Filtration.Abstractions;
using Tools.Filtration.Enums;

namespace Tools.Filtration.Types;

public record FilterGroup<T> where T: IFilter {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }
}