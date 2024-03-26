using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.AutoFilterer.Types;

namespace Tools.Filtration.AutoFilterer;

public record ExpressionBuildContext(
	Expression? CurrentBody,

	PropertyInfo TargetProperty,
	PropertyInfo FilterProperty,

	Expression FilterPropertyExpression,
	IMyFilter Filter,
	object FilterPropertyValue,
	Expression? ParameterExpression = null
);