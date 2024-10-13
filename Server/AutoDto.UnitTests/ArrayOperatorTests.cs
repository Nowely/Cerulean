using AutoDto.Abstractions;
using AutoFixture.Xunit2;
using AutoDto.Extensions;
using AutoDto.Operators;
using Xunit;

namespace AutoDto.UnitTests;

public class ArrayModel {
	public string[] StringArray { get; set; } = [];
	public string[]? NStringArray { get; set; }
}

public class ArrayFilter: IFilterModel {
	public ArrayOperator<string[]>? StringArray { get; set; }
	public ArrayOperator<string[]>? NStringArray { get; set; }
}

public class ArrayOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void EqualType(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Equal, models[0].StringArray),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void NotEqualType(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.NotEqual, models[0].StringArray),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void IsEmptyType(ArrayModel[] models) {
		models[0].StringArray = [];
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.IsEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void IsEmptyType_Null(ArrayModel[] models) {
		models[0].NStringArray = null;
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			NStringArray = new (ArrayOperatorType.IsEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void IsNotEmptyType_Null(ArrayModel[] models) {
		models[0].NStringArray = null;
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			NStringArray = new (ArrayOperatorType.IsNotEmpty),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void IntersectType_EmptyArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, []),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void IntersectType_OneElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, models[0].StringArray[..1]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void IntersectType_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void IntersectType_ThreeElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, models[0].StringArray[..3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void NotIntersectType_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.NotIntersect, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void IncludeType_OneElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Include, models[0].StringArray[..1]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void IncludeType_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Include, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void NotIncludeType_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.NotInclude, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}
}