using AutoFixture.Xunit2;
using Tools.Filtration.Abstractions;
using Tools.Filtration.Enums;
using Tools.Filtration.Extensions;
using Tools.Filtration.Operators.String;
using Xunit;

namespace Tools.Filtration.UnitTests;

public record Model_OneString(string Name);

public class ModelFilter_OneString: IFilter {
	public required StringOperator Name { get; init; }
}


public class Model_TwoString {
	public required string Name { get; set; }
	public required string LastName { get; set;}
}

public class ModelFilter_TwoString: IFilter {
	public StringOperator? Name { get; set; }
	public StringOperator? LastName { get; set; }
}

public class LogicTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void StringOperator_OneOfOneField_Success(Model_OneString[] models) {
		var query = models.AsQueryable();
		int index = Random.Next(1, models.Length);
		var filter = new ModelFilter_OneString {
			Name = new(StringOperatorType.Is, models[index].Name)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), models[index]);
	}

	[Theory, AutoData]
	public void StringOperator_OneOfTwoFields_Success(Model_TwoString[] models) {
		var query = models.AsQueryable();
		int index = Random.Next(1, models.Length);
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.Is, models[index].Name)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), models[index]);
	}

	[Theory, AutoData]
	public void StringOperator_TwoOfTwoFields_Success(Model_TwoString[] models) {
		var query = models.AsQueryable();
		int index = Random.Next(1, models.Length);
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.Is, models[index].Name),
			LastName = new(StringOperatorType.Is, models[index].LastName)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), models[index]);
	}
}