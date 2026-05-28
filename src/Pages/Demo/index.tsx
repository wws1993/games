import { PageLayout } from '../../components/layout/PageLayout';
import { Button, Card, ListItem, Text, toast } from '../../components/ui';

export default function DemoPage() {
  return (
    <PageLayout withTabBar={false}>
      <Text variant="secondary" style={{ marginBottom: 16 }}>
        二级页无底部 Tab，顶栏可返回。
      </Text>

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <ListItem title="列表示例" subtitle="副标题说明" onClick={() => toast.info('点击了列表项')} />
        <ListItem title="无箭头项" arrow={false} />
      </Card>

      <Button block onClick={() => toast.info('这是一条提示')}>
        显示 Toast
      </Button>
    </PageLayout>
  );
}
