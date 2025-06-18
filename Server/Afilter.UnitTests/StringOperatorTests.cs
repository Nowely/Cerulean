using Afilter.Abstractions;
using AutoFixture.Xunit2;
using Afilter.Extensions;
using Afilter.Operators;
using Xunit;

namespace Afilter.UnitTests;

public class StringModel {
	public required string String { get; set; }
}

public class StringFilter: IFilterModel {
	public StringOperator? String { get; set; }
}

public class StringOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void Is_Success(StringModel[] model) {
		var query = model.AsQueryable();
		int index = Random.Next(1, model.Length);
		var filter = new StringFilter {
			String = new(StringOperatorType.Is, model[index].String),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), model[index]);
	}

	[Theory, AutoData]
	public void IsNot_Success(StringModel[] model) {
		var query = model.AsQueryable();
		int index = Random.Next(1, model.Length);
		var filter = new StringFilter {
			String = new(StringOperatorType.IsNot, model[index].String),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void IsEmpty_Success(StringModel[] model) {
		model[0].String = "";
		model[2].String = "        ";
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void IsNotEmpty_Success(StringModel[] model) {
		model[0].String = "";
		model[2].String = "        ";
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsNotEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void Contains_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.Contains, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void NotContains_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.NotContains, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StartsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.StartsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void NotStartsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.NotStartsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void EndsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.EndsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void NotEndsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.NotEndsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void IsMatch_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsMatch, $"^{nameof(StringModel.String)}+")
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void IsNotMatch_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsNotMatch, $"^{nameof(StringModel.String)}+")
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}
}