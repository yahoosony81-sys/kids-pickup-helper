"use client";

import { useState } from "react";
import { ProviderDocument } from "@/lib/types/admin";
import { DocumentLightbox } from "@/components/admin/DocumentLightbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentListProps {
    documents: ProviderDocument[];
}

export default function DocumentList({ documents }: DocumentListProps) {
    const [selectedDoc, setSelectedDoc] = useState<ProviderDocument | null>(null);

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>제출일</TableHead>
                            <TableHead>학교</TableHead>
                            <TableHead>문서 유형</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    승인 대기 중인 서류가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>{doc.profiles?.school_name || "미지정"}</TableCell>
                                    <TableCell>{doc.document_type}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => setSelectedDoc(doc)}
                                        >
                                            검토하기
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <DocumentLightbox
                document={selectedDoc}
                onClose={() => setSelectedDoc(null)}
            />
        </>
    );
}
