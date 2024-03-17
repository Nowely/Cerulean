using AutoFilterer.Types;
using Cerulean.Library.Filtration.Enums;
using Cerulean.Library.Filtration.Models.Operators;

namespace Cerulean.Library.Filtration.Unit.Tests;

public record User(string Name);

public class UserFilter : FilterBase {
	public StringOperator Name { get; set; }
}

public class UnitTest1 {
	[Fact]
	public void Test1() {
		List<User> list = [
			new("Michael"),
			new("Michel"),
			new("Avram")
		];
		var query = list.AsQueryable();

		var filter = new UserFilter() {
			Name = new StringOperator(StringOperatorType.Is, "Michael")
		};

		var filteredQuery = filter.ApplyFilterTo(query);

		var result = filteredQuery.ToArray();
		Assert.Equal(result.First(), list[0]);
	}
}