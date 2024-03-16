namespace Cerulean.Service.Affairs.Models;

public class MyClass {
	public static void Main() {

	}
}

public record AffairSort {
	public SortType Name { get; init; }
	public SortType Age { get; init; }
	public SortType Enum { get; init; }
	public SortType Birthday { get; init; }
}

public enum SortType {
	Ascending,
	Descending
}