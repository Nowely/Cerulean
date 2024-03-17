using AutoFixture.Xunit2;
using Cerulean.Library.Filtration.AutoFilterer.Types;
using Cerulean.Library.Filtration.Enums;
using Cerulean.Library.Filtration.Models.Operators;
using Cerulean.Library.Filtration.Extensions;

namespace Cerulean.Library.Filtration.Unit.Tests;

public record Model_OneString(string Name);

public class ModelFilter_OneString: IMyFilter {
	public StringOperator Name { get; set; }
}


public record Model_TwoString(string Name, string LastName);

public class ModelFilter_TwoString: IMyFilter {
	public StringOperator? Name { get; set; }
	public StringOperator? LastName { get; set; }
}

public class FilterTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void StringOperator_OneOfOneField_Success(Model_OneString[] users) {
		var query = users.AsQueryable();

		var index = Random.Next(1, users.Length);

		var filter = new ModelFilter_OneString {
			Name = new StringOperator(StringOperatorType.Is, users[index].Name)
		};
		var filteredQuery = FilterExtensions.ApplyMyFilter(query, filter);
		//var filteredQuery = query.ApplyMyFilter(filter);

		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), users[index]);
	}

	[Theory, AutoData]
	public void StringOperator_OneOfTwoFields_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();

		var index = Random.Next(1, users.Length);

		var filter = new ModelFilter_TwoString {
			Name = new StringOperator(StringOperatorType.Is, users[index].Name)
		};
		var filteredQuery = FilterExtensions.ApplyMyFilter(query, filter);

		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), users[index]);
	}

	[Theory, AutoData]
	public void StringOperator_TwoOfTwoFields_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();

		var index = Random.Next(1, users.Length);

		var filter = new ModelFilter_TwoString {
			Name = new StringOperator(StringOperatorType.Is, users[index].Name),
			LastName = new StringOperator(StringOperatorType.Is, users[index].LastName)
		};
		var filteredQuery = FilterExtensions.ApplyMyFilter(query, filter);

		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), users[index]);
	}
}