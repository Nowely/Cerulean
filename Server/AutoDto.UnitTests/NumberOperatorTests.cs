using AutoDto.Abstractions;
using AutoFixture.Xunit2;
using AutoDto.Extensions;
using AutoDto.Operators;
using Xunit;

namespace AutoDto.UnitTests;

public class NumberModel {
	public int Int { get; set; }
	public int? NInt { get; set;}
	public double Double { get; set; }
	public double? NDouble { get; set; }
	public decimal Decimal { get; set; }
	public decimal? NDecimal { get; set; }
	public float Float { get; set; }
	public float? NFloat { get; set; }
}

public class NumberFilter: IFilterModel {
	public NumberOperator<int>? Int { get; set; }
	public NumberOperator<int?>? NInt { get; set; }
	public NumberOperator<double>? Double { get; set; }
	public NumberOperator<double?>? NDouble { get; set; }
	public NumberOperator<decimal>? Decimal { get; set; }
	public NumberOperator<decimal?>? NDecimal { get; set; }
	public NumberOperator<float>? Float { get; set; }
	public NumberOperator<float?>? NFloat { get; set; }
}

public class NumberOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void TwoOfTwoFields_Success(NumberModel[] model) {
		var query = model.AsQueryable();
		int index = Random.Next(1, model.Length);
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.Equal, model[index].Int),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), model[index]);
	}

	[Theory, AutoData]
	public void IsEmpty_Success(NumberModel[] model) {
		model[0].Int = default(int);
		model[1].Int = 0;
		var query = model.AsQueryable();
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.IsEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void IsNotEmpty_Success(NumberModel[] model) {
		model[0].Int = default(int);
		model[1].Int = 0;
		var query = model.AsQueryable();
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.IsNotEmpty)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void Greater_Success(NumberModel[] model) {
		model[0].Int = 1;
		model[1].Int = 2;
		model[2].Int = 3;
		var query = model.AsQueryable();
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.Greater, 0)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void GreaterOrEqual_Success(NumberModel[] model) {
		model[0].Int = 1;
		model[1].Int = 2;
		model[2].Int = 3;
		var query = model.AsQueryable();
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.GreaterOrEqual, 1)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void Less_Success(NumberModel[] model) {
		model[0].Int = 1;
		model[1].Int = 2;
		model[2].Int = 3;
		var query = model.AsQueryable();
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.Less, 4)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}

	[Theory, AutoData]
	public void LessOrEqual_Success(NumberModel[] model) {
		model[0].Int = 1;
		model[1].Int = 2;
		model[2].Int = 3;
		var query = model.AsQueryable();
		var filter = new NumberFilter {
			Int = new(NumberOperatorType.LessOrEqual, 3)
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(model.Length, result.Length);
	}
}