import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolStats } from "@/lib/types/admin";

interface SchoolStatsTableProps {
    stats: SchoolStats[];
}

export function SchoolStatsTable({ stats }: SchoolStatsTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>학교별 운영 통계</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>학교명</TableHead>
                            <TableHead className="text-right">요청 수</TableHead>
                            <TableHead className="text-right">제공자 수</TableHead>
                            <TableHead className="text-right">매칭률</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            stats.map((stat) => (
                                <TableRow key={stat.schoolName}>
                                    <TableCell className="font-medium">{stat.schoolName}</TableCell>
                                    <TableCell className="text-right">{stat.requestCount}건</TableCell>
                                    <TableCell className="text-right">{stat.providerCount}명</TableCell>
                                    <TableCell className="text-right">{stat.matchRate}%</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
