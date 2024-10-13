using AutoDto.Abstractions;
using AutoFixture.Xunit2;
using AutoDto.Extensions;
using AutoDto.Operators;
using Xunit;

namespace AutoDto.UnitTests;

public record Model_OneString(string Name);

public class ModelFilter_OneString: IFilterModel {
	public required StringOperator Name { get; init; }
}


public class Model_TwoString {
	public required string Name { get; set; }
	public required string LastName { get; set;}
}

public class ModelFilter_TwoString: IFilterModel {
	public StringOperator? Name { get; set; }
	public StringOperator? LastName { get; set; }
}

public class LogicTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void OneOfOneField_Success(Model_OneString[] models) {
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
	public void OneOfTwoFields_Success(Model_TwoString[] models) {
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
	public void TwoOfTwoFields_Success(Model_TwoString[] models) {
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