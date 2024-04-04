using Afilter.Abstractions;
using AutoFixture.Xunit2;
using Afilter.Extensions;
using Afilter.Operators;
using Xunit;

namespace Afilter.UnitTests;

public enum MyEnum {
	State1,
	State2,
	State3,
	State4
}

[Flags]
public enum MyFlagEnum {
	State1 = 0,
	State2 = 1,
	State3 = 2,
	State4 = 4
}

public class EnumModel {
	public MyEnum Enum { get; set; }
	public MyEnum? NEnum { get; set; }
	public MyFlagEnum FlagEnum { get; set; }
}

public class EnumFilter: IFilter {
	public SelectOperator<MyEnum>? Enum { get; set; }
	public SelectOperator<MyEnum?>? NEnum { get; set; }
	public SelectOperator<MyFlagEnum>? FlagEnum { get; set; }
}

public class SelectOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void SelectOperator_IsState2_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		int index = Random.Next(1, models.Length);
		models[index].Enum = MyEnum.State2;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (SelectOperatorType.Is, [MyEnum.State2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), models[index]);
	}

	[Theory, AutoData]
	public void SelectOperator_IsNotState2_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		int index = Random.Next(1, models.Length);
		models[index].Enum = MyEnum.State2;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (SelectOperatorType.IsNot, [MyEnum.State2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void SelectOperator_IsState2AndState3_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		models[0].Enum = MyEnum.State2;
		models[1].Enum = MyEnum.State3;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (SelectOperatorType.Is, [MyEnum.State2, MyEnum.State3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
		Assert.Equal(result[0], models[0]);
		Assert.Equal(result[1], models[1]);
	}

	[Theory, AutoData]
	public void SelectOperator_IsNotState2AndState3_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		models[0].Enum = MyEnum.State2;
		models[1].Enum = MyEnum.State3;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (SelectOperatorType.IsNot, [MyEnum.State2, MyEnum.State3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void SelectOperator_IsEmpty_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State2;
		models[0].Enum = MyEnum.State1;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (SelectOperatorType.IsEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void SelectOperator_IsEmptyNullable_Success(EnumModel[] models) {
		foreach (var model in models) model.NEnum = MyEnum.State1;
		models[0].NEnum = null;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			NEnum = new (SelectOperatorType.IsEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void SelectOperator_IsFlag_Success(EnumModel[] models) {
		foreach (var model in models) model.FlagEnum = MyFlagEnum.State1;
		models[0].FlagEnum = MyFlagEnum.State2 | MyFlagEnum.State3;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			FlagEnum = new (SelectOperatorType.Is, [MyFlagEnum.State2, MyFlagEnum.State3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}
}