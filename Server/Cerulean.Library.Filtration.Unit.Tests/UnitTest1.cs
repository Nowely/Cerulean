using Cerulean.Library.Filtration.AutoFilterer.Types;
using Cerulean.Library.Filtration.Enums;
using Cerulean.Library.Filtration.Models.Operators;
using Cerulean.Library.Filtration.Extensions;

namespace Cerulean.Library.Filtration.Unit.Tests;

public record User(string Name);

public class UserFilter: IMyFilter {
	public StringOperator Name { get; set; }
}

public class UnitTest1 {
	[Fact]
	public void Test2() {
		List<User> list = [
			new("Michael"),
			new("Michel"),
			new("Avram")
		];
		var query = list.AsQueryable();

		var filter = new UserFilter {
			Name = new StringOperator(StringOperatorType.Is, "Michael")
		};
		var filteredQuery = FilterExtensions.ApplyMyFilter(query, filter);
		//var filteredQuery = query.ApplyMyFilter(filter);

		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), list[0]);
	}
}