import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { Card, ListItem, Text, Title } from '../../components/ui';
import { serviceCategories } from '../../data/mock';

export default function ServicePage() {
  const navigate = useNavigate();

  return (
    <PageLayout
      fill
      header={
        <>
          <Title>服务</Title>
          <Text variant="secondary">选择分类查看全部服务项目</Text>
        </>
      }
    >
      <Card padding={false}>
        {serviceCategories.map((cat) => (
          <ListItem
            key={cat.id}
            title={cat.name}
            subtitle={cat.desc}
            onClick={() => navigate(`/service/${cat.id}`)}
          />
        ))}
      </Card>
    </PageLayout>
  );
}
