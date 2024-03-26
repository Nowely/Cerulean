using AutoFixture.Xunit2;
using Tools.Filtration.AutoFilterer.Types;
using Tools.Filtration.Enums;
using Tools.Filtration.Extensions;
using Tools.Filtration.Models.Operators;
using Xunit;

namespace Tools.Filtration.UnitTests;

public record Model_OneString(string Name);

public class ModelFilter_OneString: IMyFilter {
	public StringOperator Name { get; set; }
}


public class Model_TwoString(string name, string lastName) {
	public string Name { get; set; } = name;
	public string LastName { get; set;} = lastName;
}

public class ModelFilter_TwoString: IMyFilter {
	public StringOperator? Name { get; set; }
	public StringOperator? LastName { get; set; }
}

public class FilterTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void StringOperator_OneOfOneField_Success(Model_OneString[] users) {
		var query = users.AsQueryable();
		int index = Random.Next(1, users.Length);
		var filter = new ModelFilter_OneString {
			Name = new(StringOperatorType.Is, users[index].Name)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), users[index]);
	}

	[Theory, AutoData]
	public void StringOperator_OneOfTwoFields_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		int index = Random.Next(1, users.Length);
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.Is, users[index].Name)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), users[index]);
	}

	[Theory, AutoData]
	public void StringOperator_TwoOfTwoFields_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		int index = Random.Next(1, users.Length);
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.Is, users[index].Name),
			LastName = new(StringOperatorType.Is, users[index].LastName)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), users[index]);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsEmpty_Success(Model_TwoString[] users) {
		users[0].Name = "";
		users[1].Name = null;
		users[2].Name = "        ";
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.IsEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(3, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsNotEmpty_Success(Model_TwoString[] users) {
		users[0].Name = "";
		users[1].Name = null;
		users[2].Name = "        ";
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.IsNotEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_Contains_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.Contains, nameof(Model_TwoString.Name))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(users.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_NotContains_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.NotContains, nameof(Model_TwoString.Name))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_StartsWith_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.StartsWith, nameof(Model_TwoString.Name))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(users.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_NotStartsWith_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.NotStartsWith, nameof(Model_TwoString.Name))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_EndsWith_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.EndsWith, nameof(Model_TwoString.Name))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_NotEndsWith_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.NotEndsWith, nameof(Model_TwoString.Name))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(users.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsMatch_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.IsMatch, $"^{nameof(Model_TwoString.Name)}+")
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(users.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsNotMatch_Success(Model_TwoString[] users) {
		var query = users.AsQueryable();
		var filter = new ModelFilter_TwoString {
			Name = new(StringOperatorType.IsNotMatch, $"^{nameof(Model_TwoString.Name)}+")
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}
}