import {Button, Col, Row} from "antd"
import {observer} from "mobx-react";
import {AffairType} from "../../Pages/Tasks/constants";
import {Column} from "./components/Column";
import {store} from "../../Stores/Store";
import {useEffect} from "react";


export const Board = observer(() => {
	useEffect(() => {
		//TODO caching?
		store.affairs.get();
	}, []);

	return (
		<div style={{marginTop: 10}}>
			<Row gutter={[16, 8]}>
				<Header type={AffairType.Daily}/>
				<Header type={AffairType.Week}/>
				<Header type={AffairType.Month}/>
				<Header type={AffairType.Year}/>
			</Row>

			<Row gutter={[16, 8]}>
				<Column type={AffairType.Daily}/>
				<Column type={AffairType.Week}/>
				<Column type={AffairType.Month}/>
				<Column type={AffairType.Year}/>
			</Row>
		</div>
	)
})

const Header = ({type}: { type: AffairType }) => {
	return (
		<Col span={3} style={{
			marginLeft: 8,
			marginRight: 8,
			paddingLeft: 6,
			paddingTop: 6,
			paddingBottom: 6,
			backgroundColor: 'lightcyan'
		}}
		>
			{/*<Tag color="cyan">
                {_.findKey(AffairType, (value) => value === type)}
            </Tag>*/}
			<Button type='text' size='small'>
				{Object.keys(AffairType)[type]}
			</Button>
		</Col>
	)
}