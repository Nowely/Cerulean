using Afilter.Abstractions;
using AutoFixture.Xunit2;
using Afilter.Extensions;
using Afilter.Operators;
using Xunit;

namespace Afilter.UnitTests;

public class BoolModel {
	public bool Bool { get; set; }
	public bool? NBool { get; set; }
}

public class BoolFilter: IFilter {
	public EqualOperator<bool>? Bool { get; set; }
	public EqualOperator<bool?>? NBool { get; set; }
}

public class EqualOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void EqualOperator_True_Success(BoolModel[] model) {
		foreach (var boolModel in model) boolModel.Bool = false;
		int index = Random.Next(1, model.Length);
		model[index].Bool = true;
		var query = model.AsQueryable();
		var filter = new BoolFilter {
			Bool = new (model[index].Bool),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), model[index]);
	}

	[Theory, AutoData]
	public void EqualOperator_False_Success(BoolModel[] model) {
		foreach (var boolModel in model) boolModel.Bool = true;
		int index = Random.Next(1, model.Length);
		model[index].Bool = false;
		var query = model.AsQueryable();
		var filter = new BoolFilter {
			Bool = new (model[index].Bool),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), model[index]);
	}

	[Theory, AutoData]
	public void EqualOperator_NullableTrue_Success(BoolModel[] model) {
		foreach (var boolModel in model) boolModel.NBool = false;
		int index = Random.Next(1, model.Length);
		model[index].NBool = true;
		var query = model.AsQueryable();
		var filter = new BoolFilter {
			NBool = new (model[index].NBool),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), model[index]);
	}

	[Theory, AutoData]
	public void EqualOperator_Null_Success(BoolModel[] model) {
		foreach (var boolModel in model) boolModel.NBool = false;
		int index = Random.Next(1, model.Length);
		model[index].NBool = null;
		var query = model.AsQueryable();
		var filter = new BoolFilter {
			NBool = new (model[index].NBool),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), model[index]);
	}
}