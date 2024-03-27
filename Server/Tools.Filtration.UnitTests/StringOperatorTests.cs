using AutoFixture.Xunit2;
using Tools.Filtration.AutoFilterer.Types;
using Tools.Filtration.Enums;
using Tools.Filtration.Extensions;
using Tools.Filtration.Models.Operators;
using Xunit;

namespace Tools.Filtration.UnitTests;

public class StringModel {
	public string String { get; set; }
}

public class StringFilter: IMyFilter {
	public StringOperator? String { get; set; }
}

public class StringOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void StringOperator_Is_Success(StringModel[] model) {
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
	public void StringOperator_IsNot_Success(StringModel[] model) {
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
	public void StringOperatorType_IsEmpty_Success(StringModel[] model) {
		model[0].String = "";
		model[1].String = null;
		model[2].String = "        ";
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(3, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsNotEmpty_Success(StringModel[] model) {
		model[0].String = "";
		model[1].String = null;
		model[2].String = "        ";
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsNotEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_Contains_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.Contains, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_NotContains_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.NotContains, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_StartsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.StartsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_NotStartsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.NotStartsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_EndsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.EndsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void StringOperatorType_NotEndsWith_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.NotEndsWith, nameof(StringModel.String))
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsMatch_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsMatch, $"^{nameof(StringModel.String)}+")
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void StringOperatorType_IsNotMatch_Success(StringModel[] model) {
		var query = model.AsQueryable();
		var filter = new StringFilter {
			String = new(StringOperatorType.IsNotMatch, $"^{nameof(StringModel.String)}+")
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}
}