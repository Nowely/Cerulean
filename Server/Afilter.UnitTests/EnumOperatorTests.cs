using AutoFixture.Xunit2;
using Afilter.Extensions;
using Afilter.Operators;
using Tools.Filtration.Abstractions;
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
	State1,
	State2,
	State3,
	State4
}

public class EnumModel {
	public MyEnum Enum { get; set; }
	public MyEnum? NEnum { get; set; }
	public MyFlagEnum FlagEnum { get; set; }
}

public class EnumFilter: IFilter {
	public EnumOperator<MyEnum>? Enum { get; set; }
	public EnumOperator<MyEnum?>? NEnum { get; set; }
	public EnumOperator<MyFlagEnum>? FlagEnum { get; set; }
}

public class EnumOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void EqualOperator_IsState2_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		int index = Random.Next(1, models.Length);
		models[index].Enum = MyEnum.State2;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (EnumOperatorType.Is, [MyEnum.State2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), models[index]);
	}

	[Theory, AutoData]
	public void EqualOperator_IsNotState2_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		int index = Random.Next(1, models.Length);
		models[index].Enum = MyEnum.State2;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (EnumOperatorType.IsNot, [MyEnum.State2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void EqualOperator_IsState2AndState3_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		models[0].Enum = MyEnum.State2;
		models[1].Enum = MyEnum.State3;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (EnumOperatorType.Is, [MyEnum.State2, MyEnum.State3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
		Assert.Equal(result[0], models[0]);
		Assert.Equal(result[1], models[1]);
	}

	[Theory, AutoData]
	public void EqualOperator_IsNotState2AndState3_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State1;
		models[0].Enum = MyEnum.State2;
		models[1].Enum = MyEnum.State3;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (EnumOperatorType.IsNot, [MyEnum.State2, MyEnum.State3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void EqualOperator_IsEmpty_Success(EnumModel[] models) {
		foreach (var model in models) model.Enum = MyEnum.State2;
		models[0].Enum = MyEnum.State1;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			Enum = new (EnumOperatorType.IsEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void EqualOperator_IsEmptyNullable_Success(EnumModel[] models) {
		foreach (var model in models) model.NEnum = MyEnum.State1;
		models[0].NEnum = null;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			NEnum = new (EnumOperatorType.IsEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void EqualOperator_IsFlag_Success(EnumModel[] models) {
		foreach (var model in models) model.FlagEnum = MyFlagEnum.State1;
		models[0].FlagEnum = MyFlagEnum.State2 | MyFlagEnum.State3;
		var query = models.AsQueryable();
		var filter = new EnumFilter() {
			FlagEnum = new (EnumOperatorType.Is, [MyFlagEnum.State2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}
}