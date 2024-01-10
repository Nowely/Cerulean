import {useState} from 'react';
import {Button, Container, Typography} from "@mui/material"
import {observer} from "mobx-react";
import {Timer} from "../Models/Timer";

const myTimer = new Timer();

interface Interface {
	timer: Timer
}

//TODO remove example
// Build a "user interface" that uses the observable state.
const TimerView = observer(({ timer }: Interface) => (
	<Button onClick={() => timer.reset()}>Seconds passed: {timer.secondsPassed}</Button>
))

export const Counter = () => {
	const [count, setCount] = useState(0);
	return <Container>
		<Typography paragraph>
			{`Current count: ${count}`}
		</Typography>

		<Button variant="contained" color="secondary" onClick={() => setCount(count - 1)}>Decrement</Button>
		<Button variant="contained" color="primary" onClick={() => setCount(count + 1)}>Increment</Button>

		<TimerView timer={myTimer} />
	</Container>;
}

Counter.displayName = Counter.name;

 // Update the 'Seconds passed: X' text every second.
setInterval(() => {
	myTimer.increase()
}, 1000)