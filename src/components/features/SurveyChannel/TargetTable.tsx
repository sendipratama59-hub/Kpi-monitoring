import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Target, Camera, Edit } from 'lucide-react';

interface TargetData {
    salesman_name: string;
    target: number;
    actual: number;
    kurang: number;
    achieve: string;
    reward: number;
}

interface TargetTableProps {
  targetTableRef: React.RefObject<HTMLDivElement>;
  isShared: boolean;
  targetData: TargetData[];
  handleDownloadTargetImage: () => void;
  openTargetModal: () => void;
}

export function TargetTable({
  targetTableRef,
  isShared,
  targetData,
  handleDownloadTargetImage,
  openTargetModal
}: TargetTableProps) {
  const totalReward = targetData.reduce((acc, curr) => acc + (curr.target > 0 ? curr.reward : 0), 0);
  const remainingBudget = 2000000 - totalReward;

  return (
    <div ref={targetTableRef}>
      <Card className="bg-white">
      <CardHeader className="pb-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="text-lg flex items-center w-full sm:w-auto">
          <Target className="mr-2 h-5 w-5 text-indigo-500" />
          Target Survey
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleDownloadTargetImage} title="Download Screenshot">
            <Camera className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Screenshot</span>
          </Button>
          {!isShared && (
            <Button variant="outline" size="sm" onClick={openTargetModal}>
              <Edit className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Set Target</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-[10px] sm:text-sm text-left">
            <thead className="text-[10px] sm:text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3">Nama Sales</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Target</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Actual</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">%</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                  <span className="text-emerald-600">R</span> / <span className="text-red-600">P</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {targetData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 sm:px-4 py-4 sm:py-8 text-center text-slate-500">
                    Belum ada data target sales.
                  </td>
                </tr>
              ) : (
                targetData.map((data, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-slate-900">{data.salesman_name}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-600">{data.target}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium text-indigo-600">{data.actual}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-medium whitespace-nowrap ${Number(data.achieve) >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {data.achieve}%
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium">
                      {data.target > 0 ? (
                        data.reward < 0 ? (
                          <span className="text-red-600 whitespace-nowrap">- Rp {Math.abs(data.reward).toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-emerald-600 whitespace-nowrap">+ Rp {data.reward.toLocaleString('id-ID')}</span>
                        )
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {targetData.length > 0 && (
              <tfoot className="bg-slate-50 border-t">
                <tr className="border-b">
                  <td colSpan={4} className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-slate-700">Total Reward/Punishment:</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold whitespace-nowrap">
                    {totalReward < 0 ? (
                      <span className="text-red-600">- Rp {Math.abs(totalReward).toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-emerald-600">+ Rp {totalReward.toLocaleString('id-ID')}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-slate-700 leading-tight">Budget Reward <br className="sm:hidden" /> (Sisa dr 2M):</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-indigo-600 whitespace-nowrap">
                    Rp {remainingBudget.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
