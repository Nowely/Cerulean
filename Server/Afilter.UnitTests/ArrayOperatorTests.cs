using AutoFixture.Xunit2;
using Afilter.Extensions;
using Afilter.Operators;
using Tools.Filtration.Abstractions;
using Xunit;

namespace Afilter.UnitTests;

public class ArrayModel {
	public string[] StringArray { get; set; } = [];
	public string[]? NStringArray { get; set; }
}

public class ArrayFilter: IFilter {
	public ArrayOperator<string[]>? StringArray { get; set; }
	public ArrayOperator<string[]>? NStringArray { get; set; }
}

public class ArrayOperatorTests {
	private static readonly Random Random = new();

	[Theory, AutoData]
	public void ArrayOperator_Equal(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Equal, models[0].StringArray),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void ArrayOperator_NotEqual(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.NotEqual, models[0].StringArray),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void ArrayOperator_IsEmpty(ArrayModel[] models) {
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
	public void ArrayOperator_IsEmptyForNull(ArrayModel[] models) {
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
	public void ArrayOperator_IsNotEmptyForNull(ArrayModel[] models) {
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
	public void Intersect_EmptyArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, []),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Empty(result);
	}

	[Theory, AutoData]
	public void Intersect_OneElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, models[0].StringArray[..1]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void Intersect_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void Intersect_ThreeElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Intersect, models[0].StringArray[..3]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void NotIntersect_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.NotIntersect, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}

	[Theory, AutoData]
	public void Include_OneElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Include, models[0].StringArray[..1]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void Include_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.Include, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
	}

	[Theory, AutoData]
	public void NotInclude_TwoElementArray(ArrayModel[] models) {
		var query = models.AsQueryable();
		var filter = new ArrayFilter() {
			StringArray = new (ArrayOperatorType.NotInclude, models[0].StringArray[..2]),
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
	}
}