using Tools.Filtration.Enums;

namespace Tools.Filtration.Models;

public record FilterGroup<T> {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }
}