import {Button, Col, Row, Segmented, Tag} from "antd"
import {AffairStore} from "../../Stores/AffairStore";
import {observer, useLocalObservable} from "mobx-react";
import {AffairType} from "../../Pages/Tasks/constants";
import _ from "lodash";
import {Column} from "./components/Column";


export const Board = observer(() => {
    const a = useLocalObservable(() => ({
        count: 123,
    }))

    const data = AffairStore.instance.data;
    console.log(data)
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
        <Col span={3}
             style={{
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
                {_.findKey(AffairType, (value) => value === type)}
            </Button>

            <Segmented
                style={{marginLeft: 58}}
                size='small' options={['Active', 'Completed', 'Failed']} />
        </Col>
    )
}