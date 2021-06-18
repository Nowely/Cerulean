import {useState} from 'react';
import {Button, Container, Typography} from "@material-ui/core";

export const Counter = () => {
	const [count, setCount] = useState(0);

	return <Container>
		<Typography paragraph>
			{`Current count: ${count}`}
		</Typography>

		<Button variant="contained" color="secondary" onClick={() => setCount(count - 1)}>Decrement</Button>
		<Button variant="contained" color="primary" onClick={() => setCount(count + 1)}>Increment</Button>
	</Container>;
}
Counter.displayName = Counter.name;
