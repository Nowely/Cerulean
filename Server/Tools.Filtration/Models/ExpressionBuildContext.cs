using System.Linq.Expressions;
using System.Reflection;
using AutoFilterer.Abstractions;
using Tools.Filtration.Abstractions;

namespace Tools.Filtration.Models;

public record ExpressionBuildContext(
	Expression? CurrentBody,

	PropertyInfo TargetProperty,
	PropertyInfo FilterProperty,

	Expression FilterPropertyExpression,
	IMyFilter Filter,
	IFilterableType FilterPropertyValue,
	Expression? ParameterExpression = null
);